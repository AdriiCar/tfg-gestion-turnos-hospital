%PARAMETROS DE ENTRADA
int: num_empleados;
int: num_turnos_base;
int: longitud_patron;
int: dias_anuales;

set of int: P = 1..num_empleados; %conjuntos de empleados a los que asignar un turno
set of int: T = 1..num_turnos_base; %conjuntos de turnos a asignar
set of int: D = 1..longitud_patron; %conjunto de dias dentro de un turno

int: M = 1;
int: N = 2;
int: L = 3;
set of int: O = {M , N ,L}; %Cada uno de los turnos que se pueden asignar



%usuarios de prueba;
array[P] of int: horas_contrato;
array[P] of int: es_senior;

%cobertura neesaria
int: cob_M;
int: cob_N;

int: horas_M;
int: horas_N;

%variables de decison

%turnos_{t,d}: Define la secuencia del turno t
array[T,D] of var O: turnos;

%asignacion_{p,t,desp} la persona p tiene el turno t con origen en desp
array[P,T,D] of var bool: asignacion;  

%dia_{p,d} tiene el turno que hace la persona p el dia d
array[P,D] of var O: dia;

%variable a minimizar de la diferencia en el computo horario
var int: maxima_diferencia;


%CONSTRAINTS:

%1. TODA PERSONA SOLO TINE UN TURNO Y UN DESPLAZAMIENTO ASIGNADO

constraint forall(p in P)(
  sum(t in T, d in D)(bool2int(asignacion[p,t,d])) == 1
);

%2. LOGICA DE PATRONES

constraint forall(t in T)(
  %No puede ser mañana tras noche
  forall(d in 1..longitud_patron - 1)(
    (turnos[t,d] == N) -> (turnos[t,d+1] != M)
  )
  /\ %comprobamos que cuando se vaya a repetir el patron el ultimo dia del mimso no sea noche y el siguiente mañana
  ((turnos[t,longitud_patron] == N) -> (turnos[t, 1] != M) ) 
  
  /\%ponemos un maximo de 5 dias trabajados
  sum(d in D)(turnos[t,d] != L) <= 5
);

%3. EVITAR SIMETRIAS -> MMMLL NNLLL es igual a NNLLL MMMLL
constraint forall(t in 1..num_turnos_base-1)(
  sum(d in D)(turnos[t,d] != L) >= sum(d in D)(turnos[t+1, d] != L)
);

%4.Para cada asignacion de un usuario rellenamos la variable dia

constraint forall(p in P, t in T, desf in D)(
  asignacion[p,t,desf] -> forall(d_actual in D)(dia[p,d_actual] == turnos[t, ((d_actual-desf) mod longitud_patron + longitud_patron) mod longitud_patron + 1])
);

%5. COBERTURA DIARIA Y EXPERIENCIA -> comprobamos si se llega a los minimos requeridos por turno y aseguramos no dejar solo en planta a juniors

constraint forall(d_actual in D) (
    sum(p in P) (bool2int(dia[p, d_actual] == M)) >= cob_M /\
    sum(p in P) (bool2int(dia[p, d_actual] == N)) >= cob_N
    /\
    (cob_M > 0 -> sum(p in P where es_senior[p]==1)(bool2int(dia[p,d_actual] == M)) >= 1) /\
    (cob_N > 0 -> sum(p in P where es_senior[p]==1)(bool2int(dia[p,d_actual] == N)) >= 1)
);

%6. COMPUTO HORARIO -> buscamos minimizar la diferencia horaria

constraint forall(p in P) (
    maxima_diferencia >= abs(
        (
            (
                sum(d_actual in D) (
                    bool2int(dia[p, d_actual] == M) * horas_M + 
                    bool2int(dia[p, d_actual] == N) * horas_N
                ) * dias_anuales 
            ) div longitud_patron 
        ) 
        - horas_contrato[p] 
    ) 
);

solve minimize maxima_diferencia;